#!/usr/bin/env python3
import fileinput
import datetime

today = datetime.date.today()
start = [(3,20),(4,2),(9,12),(11,16)]
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