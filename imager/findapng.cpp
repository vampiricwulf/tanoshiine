#include <napi.h>
#include "apngDetector.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	return apngDetector::Init(env, exports);
}

NODE_API_MODULE(findapng, Init)
