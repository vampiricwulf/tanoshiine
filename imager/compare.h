#ifndef COMPARE_H_
#define COMPARE_H_

#include <vector>
#include <string>

typedef char TCHAR;
typedef unsigned char BYTE;

unsigned int countDiff(const std::vector<BYTE>& a, const std::vector<BYTE>& b);
std::vector<BYTE> base64Decode(const std::string& input);
#endif //COMPARE_H_
