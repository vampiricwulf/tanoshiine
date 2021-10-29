#!/usr/bin/env python3
import fileinput
import datetime
import os
import codecs
import time

today = datetime.date.today()
with open("/root/birthdays.txt") as file:
	next(file)
	raw = []
	for line in file:
		raw.append(tuple(line.split()))
names = [' '.join(i[2:]) for i in raw]
start = [(int(i[0]),int(i[1])) for i in raw]
birthday = False
for d in range(len(start)):
	if (today.month,today.day) == start[d]:
		if not os.path.isfile("/home/webby/doushio/hot.js.bak"):
			with fileinput.FileInput("/home/webby/doushio/imager/config.js", inplace=True, backup='.bak') as file:
				for line in file:
					print(line.replace("IMAGE_HATS: false", "IMAGE_HATS: true"), end="")
			with codecs.open("/home/webby/doushio/hot.js",'r',encoding='utf-8') as fi, \
				codecs.open("/home/webby/doushio/hot.js.tmp",'w',encoding='utf-8') as fo:
				for line in fi:
					if "CUSTOM_BANNER_TOP:" in line:
						fo.write('	CUSTOM_BANNER_TOP: "Happy Birthday ' + names[d] + '!",\n')
					else:
						fo.write(line)
			os.rename("/home/webby/doushio/hot.js","/home/webby/doushio/hot.js.bak")
			os.rename("/home/webby/doushio/hot.js.tmp","/home/webby/doushio/hot.js")
		else:
			with codecs.open("/home/webby/doushio/hot.js",'r',encoding='utf-8') as fi, \
				codecs.open("/home/webby/doushio/hot.js.tmp",'w',encoding='utf-8') as fo:
				for line in fi:
					if "CUSTOM_BANNER_TOP:" in line:
						fo.write('	CUSTOM_BANNER_TOP: "Happy Birthday ' + names[d] + '!",\n')
					else:
						fo.write(line)
			os.rename("/home/webby/doushio/hot.js.tmp","/home/webby/doushio/hot.js")
		os.system("su - webby -c '/usr/bin/screen -S boards -X quit'")
		time.sleep(5)
		os.system("su - webby -c '~/_hats.sh'")
		birthday = True
if not birthday and os.path.isfile("/home/webby/doushio/hot.js.bak"):
	with fileinput.FileInput("/home/webby/doushio/imager/config.js", inplace=True, backup='.bak') as file:
		for line in file:
			print(line.replace("IMAGE_HATS: true", "IMAGE_HATS: false"), end="")
	os.rename("/home/webby/doushio/hot.js.bak","/home/webby/doushio/hot.js")
	os.system("su - webby -c '/usr/bin/screen -S boards -X quit'")
	time.sleep(5)
	os.system("su - webby -c '~/_hats.sh'")
