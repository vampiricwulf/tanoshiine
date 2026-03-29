#include "apngDetector.h"

const std::string apng("acTL");
const std::string idat("IDAT");

apngDetector::apngDetector(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<apngDetector>(info) {
  cOffset = 8; //skip signature
}

Napi::Object apngDetector::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "apngDetector", {
    InstanceMethod("Detect", &apngDetector::Detect),
  });

  exports.Set("apngDetector", func);
  return exports;
}

/* Gets a buffer with image data in it.
 * returns 0, if it doesn't find anything.
 * returns 1  if the file is an apng
 * returns 2  if the file isn't an apng
 */
Napi::Value apngDetector::Detect(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!info[0].IsBuffer()) {
    Napi::TypeError::New(env, "apngDetector:Wrong argument (did you pass a buffer?)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<char> buf = info[0].As<Napi::Buffer<char>>();
  char* buffer = buf.Data();
  unsigned int length = buf.Length();
  unsigned int offset = 0;
  int result = 0;

  int carryOffset = cOffset;
  if(carryOffset<0){ //carrying split chunk type from previous pipe
    std::string newBuf = cBytes + std::string(buffer, length);
    result = checkChunk((unsigned char*)newBuf.c_str(), offset, newBuf.length());
    if(result){
      return Napi::Number::New(env, result);
    }
  }else
    offset+=carryOffset; //carrying previous offset

  while((offset+8)<length){
    result = checkChunk((unsigned char*)buffer, offset, length);
    if(result){
      return Napi::Number::New(env, result);
    }
  }
  //didn't find anything+
  cOffset = offset-length;
  if(offset<length){ //Split chunk length/type
    std::string carry(buffer+offset,buffer+length);
    cBytes = carry;
  }
  return Napi::Number::New(env, 0);
}

int apngDetector::checkChunk(const unsigned char* buffer, unsigned int& offset, unsigned int length){
  if (offset + 8 > length)
      return 0;
  std::string chunkID(buffer+offset+4,buffer+offset+8);
  if(chunkID==apng)
      return 1;
  if(chunkID==idat)
      return 2;
  unsigned int chunkLen = (*(buffer+offset)<<24)|
                  (*(buffer+offset+1)<<16)|
                  (*(buffer+offset+2)<<8)|
                  (*(buffer+offset+3)); //read always in BE order
  if (chunkLen > length || offset + chunkLen + 12 < offset || offset + chunkLen + 12 > length)
      return 2; // Treat malformed chunk as end-of-scan
  offset+=chunkLen+12;//type(4),len(4),crc(4)
  return 0;
}
