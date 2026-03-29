/*
  1) Receive an integer for the minimal amount of bits needed to not trigger a duplicate, a 43 character base64 string and an array of  '<post number>:<43 char base64 string>' from node
  2) Convert second argument to binary
  3) loop through the array by doing the following:
    a) slice of array member's '<post number>:'
    b) convert base64 to binary
    c) XOR the first string against the array member string
    d) If the number of different bits is below the first argument return matching post number and exit. Otherwise continue to the next array member
  6) all array elements pass, return 0, if there is an error return -1
 */
#include <cstdlib>
#include <string>
#include <bitset>
#include <cstdint>
#include <algorithm>

#include <napi.h>

#include "compare.h"

static const TCHAR padCharacter = '=';
std::vector<BYTE> base64Decode(const std::string& input)
{
  size_t padding = 0;
  if (input.length() >= 1 && input[input.length()-1] == padCharacter)
    padding++;
  if (input.length() >= 2 && input[input.length()-2] == padCharacter)
    padding++;

  //Setup a vector to hold the result
  std::vector<BYTE> decodedBytes;
  decodedBytes.reserve(((input.length()/4)*3) - padding);
  uint32_t temp=0; //Holds decoded quanta
  std::string::const_iterator cursor = input.begin();
  while (cursor < input.end())
  {
    for (size_t quantumPosition = 0; quantumPosition < 4; quantumPosition++)
    {
      temp <<= 6;
      if       (*cursor >= 0x41 && *cursor <= 0x5A) // This area will need tweaking if
        temp |= *cursor - 0x41;                     // you are using an alternate alphabet
      else if  (*cursor >= 0x61 && *cursor <= 0x7A)
        temp |= *cursor - 0x47;
      else if  (*cursor >= 0x30 && *cursor <= 0x39)
        temp |= *cursor + 0x04;
      else if  (*cursor == 0x2B || *cursor == 0x2D) // + or -
        temp |= 0x3E;
      else if  (*cursor == 0x2F || *cursor == 0x5F) // / or _
        temp |= 0x3F;
      else if  (*cursor == padCharacter) //pad
      {
        switch( input.end() - cursor )
        {
        case 1: //One pad character
          decodedBytes.push_back((temp >> 16) & 0x000000FF);
          decodedBytes.push_back((temp >> 8 ) & 0x000000FF);
          return decodedBytes;
        case 2: //Two pad characters
          decodedBytes.push_back((temp >> 10) & 0x000000FF);
          return decodedBytes;
        }
      }
      cursor++;
    }
    decodedBytes.push_back((temp >> 16) & 0x000000FF);
    decodedBytes.push_back((temp >> 8 ) & 0x000000FF);
    decodedBytes.push_back((temp      ) & 0x000000FF);
  }
  return decodedBytes;
}
/* Counts the number of different bits between two byte vectors
 * Input:
 *	a,b: Strings to compare
 */
unsigned int countDiff(const std::vector<BYTE>& a, const std::vector<BYTE>& b)
{
  unsigned int buf=0;
  unsigned int len = std::min(a.size(), b.size());
  for(unsigned int i=0;i<len;i++)
    buf+=(std::bitset<8>(a[i]^b[i])).count();
  if (a.size() != b.size()) {
    unsigned int diff = a.size() > b.size() ? a.size() - b.size() : b.size() - a.size();
    buf += diff * 8;
  }
  return buf;
}

Napi::Value hashCompareCpp(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();

  if(info.Length()<3){
    Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  if(!info[0].IsNumber() || !info[1].IsString() || !info[2].IsArray()){
    Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  unsigned int threshold = info[0].As<Napi::Number>().Uint32Value();

  std::vector<BYTE> posted = base64Decode(info[1].As<Napi::String>().Utf8Value());

  Napi::Array toTest = info[2].As<Napi::Array>();
  for(uint32_t i=0; i<toTest.Length();i++) {
    Napi::Value elem = toTest.Get(i);
    if (!elem.IsString())
      continue;
    std::string numHash = elem.As<Napi::String>().Utf8Value();

    size_t numPos = numHash.find_first_of(':');
    if (numPos == std::string::npos || numPos + 1 >= numHash.length())
      continue;
    std::vector<BYTE> tested = base64Decode(numHash.substr(numPos+1));
    if(countDiff(posted,tested)<threshold){
      return Napi::Number::New(env, atoi(numHash.substr(0,numPos).c_str()));
    }
  }
  return Napi::Number::New(env, 0);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("hashCompareCpp", Napi::Function::New(env, hashCompareCpp));
  return exports;
}

NODE_API_MODULE(compare, Init)
