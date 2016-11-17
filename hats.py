#!/usr/bin/env python3
import fileinput
import datetime

today = datetime.date.today()
with open("/root/birthdays.txt") as file:
	next(file)
	raw = []
	for line in file:
		raw.append(tuple(line.split()))
start = [(int(i[0]),int(i[1])) for i in raw]
end = start[:]
for t in range(len(end)):
	end[t] = (end[t][0],end[t][1]+1)
for date in start:
	if (today.month,today.day) == date:
		with fileinput.FileInput("/home/webby/doushio/imager/config.js", inplace=True, backup='.bak') as file:
    		for line in file:
        		print(line.replace("IMAGE_HATS: false", "IMAGE_HATS: true"), end="")
for date in end:
	if (today.month,today.day) == date:
		with fileinput.FileInput("/home/webby/doushio/imager/config.js", inplace=True, backup='.bak') as file:
    		for line in file:
        		print(line.replace("IMAGE_HATS: true", "IMAGE_HATS: false"), end="")