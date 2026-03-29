#ifndef APNGDETECTOR_H
#define APNGDETECTOR_H

#include <napi.h>
#include <string>

class apngDetector : public Napi::ObjectWrap<apngDetector>
{
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  apngDetector(const Napi::CallbackInfo& info);

private:
  Napi::Value Detect(const Napi::CallbackInfo& info);

  int checkChunk(const unsigned char* buffer, unsigned int& offset, unsigned int length);
  int cOffset;
  std::string cBytes;
};
#endif // APNGDETECTOR_H
