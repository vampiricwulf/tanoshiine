#!/usr/bin/env python3
import fileinput
import datetime
import os

today = datetime.date.today()
with open("/root/birthdays.txt") as file:
	next(file)
	raw = []
	for line in file:
		raw.append(tuple(line.split()))
names = [' '.join(i[2:]) for i in raw]
start = [(int(i[0]),int(i[1])) for i in raw]
end = start[:]
for t in range(len(end)):
	end[t] = (end[t][0],end[t][1]+1)
for d in range(len(start)):
	if (today.month,today.day) == start[d]:
		with fileinput.FileInput("/home/webby/doushio/imager/config.js", inplace=True, backup='.bak') as file:
			for line in file:
				print(line.replace("IMAGE_HATS: false", "IMAGE_HATS: true"), end="")
		with fileinput.FileInput("/home/webby/doushio/hot.js", inplace=True, backup='.bak') as file:
			for line in file:
				if "CUSTOM_BANNER_TOP:" in line:
					print('	CUSTOM_BANNER_TOP: "Happy Birthday ' + names[d] + '!",', end="")
				else:
					print(line, end="")
	if (today.month,today.day) == end[d]:
		with fileinput.FileInput("/home/webby/doushio/imager/config.js", inplace=True, backup='.bak') as file:
			for line in file:
				print(line.replace("IMAGE_HATS: true", "IMAGE_HATS: false"), end="")
		os.rename("/home/webby/doushio/hot.js.bak","/home/webby/doushio/hot.js")