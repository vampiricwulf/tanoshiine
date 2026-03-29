#define _XOPEN_SOURCE
#include <errno.h>
#include <iconv.h>
#include <unistd.h>
#include <string.h>
#include <napi.h>

static char SECURE_SALT[21] = "$5$";
#define TRIP_MAX 128

static Napi::Value setup_callback(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	if (info.Length() != 1 || !info[0].IsString())
		return Napi::Boolean::New(env, false);
	std::string saltVal = info[0].As<Napi::String>().Utf8Value();
	if (saltVal.length() < 16)
		return Napi::Boolean::New(env, false);
	memcpy(SECURE_SALT + 3, saltVal.c_str(), 16);
	SECURE_SALT[19] = '$';
	SECURE_SALT[20] = 0;
	return Napi::Boolean::New(env, true);
}

static void fix_char(char &c) {
	static const char *from = ":;<=>?@[\\]^_`", *to = "ABCDEFGabcdef";
	const char *p;
	if (c < '.' || c > 'z')
		c = '.';
	else if ((p = strchr(from, c)))
		c = to[p - from];
}

static void hash_trip(char *key, size_t len, char *dest) {
	char *digest, salt[3] = "..";
	if (len == 1)
		salt[0] = 'H';
	else if (len == 2) {
		salt[0] = key[1];
		salt[1] = 'H';
	}
	else if (len)
		strncpy(salt, key + 1, 2);
	fix_char(salt[0]);
	fix_char(salt[1]);
	digest = crypt(key, salt);
	if (!digest)
		return;
	len = strlen(digest);
	if (len < 11)
		return;
	digest += len - 11;
	digest[0] = '!';
	strncpy(dest, digest, 12);
}

static void hash_secure(char *key, size_t len, char *dest) {
	size_t i;
	char *digest;
	if (len > TRIP_MAX) {
		len = TRIP_MAX;
		key[TRIP_MAX] = 0;
	}
	for (i = 0; i < len; i++)
		fix_char(key[i]);
	digest = crypt(key, SECURE_SALT);
	if (!digest)
		return;
	len = strlen(digest);
	if (len < 12)
		return;
	digest += len - 12;
	digest[0] = digest[1] = '!';
	strncpy(dest, digest, 13);
}

static iconv_t conv_desc;

static int setup_conv() {
	conv_desc = iconv_open("SHIFT_JIS", "UTF-8");
	if (conv_desc == (iconv_t) -1) {
		fprintf(stderr, "Can't convert to SHIFT_JIS.\n");
		return 0;
	}
	return 1;
}

typedef void (*trip_f)(char *, size_t, char *);

static void with_SJIS(const std::string& trip, trip_f func, char *ret) {
	if (trip.empty())
		return;
	size_t src_left = trip.length();
	if (src_left > TRIP_MAX / 2)
		src_left = TRIP_MAX / 2;
	char src_buf[TRIP_MAX+1];
	memcpy(src_buf, trip.c_str(), src_left);
	src_buf[src_left] = 0;
	char *src = src_buf;
	size_t dest_left = TRIP_MAX;
	char sjis[TRIP_MAX+1];
	char *dest = sjis;
	size_t result = iconv(conv_desc, &src, &src_left, &dest, &dest_left);
	if (result == (size_t) -1 && errno != EILSEQ && errno != EINVAL) {
		perror("iconv");
		return;
	}
	ssize_t len = TRIP_MAX - dest_left;
	if (len > 0) {
		sjis[len] = 0;
		func(sjis, len, ret);
	}
}

Napi::Value hash_callback(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	if (info.Length() != 2 || !info[0].IsString() || !info[1].IsString())
		return env.Null();

	std::string trip = info[0].As<Napi::String>().Utf8Value();
	std::string secure = info[1].As<Napi::String>().Utf8Value();
	char digest[24];
	digest[0] = 0;
	with_SJIS(trip, &hash_trip, digest);
	with_SJIS(secure, &hash_secure, digest + strlen(digest));
	return Napi::String::New(env, digest);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	if (!setup_conv())
		return exports;
	exports.Set("setSalt", Napi::Function::New(env, setup_callback));
	exports.Set("hash", Napi::Function::New(env, hash_callback));
	return exports;
}

NODE_API_MODULE(tripcode, Init)
