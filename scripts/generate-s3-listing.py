#!/usr/bin/env python
import fileinput
import os

base_url = 'https://mapbox.s3.amazonaws.com/mapbox-studio'

html_start = '''
<html>
<head><title>Mapbox Studio downloads</title></head>
<body bgcolor="white">
<h1>Mapbox Studio downloads</h1><hr><pre>
'''

html_end = '''
</pre><hr></body>
</html>
'''

line_template =  '%(date)s %(time)s  %(size)s  <a href="%(name)s">%(name)s</a>  build: <a href="https://github.com/mapbox/mapbox-studio/commit/%(gitSHA)s">%(gitSHA)s</a>'

print html_start

downloads = {}

for line in fileinput.input():
    stripped = line.strip()
    if 'mapbox-studio-' in stripped:
        parts = stripped.split(' ')
        date = parts[0]
        time = parts[1]
        size = '%s MB' % (int(parts[3])/1000000)
        name = parts[4]
        gitSHA = '-'.join(os.path.splitext(name)[0].split('-')[4:])
        downloads[date+name] = line_template % (locals())

sorted_by_date = sorted(downloads, key=lambda key: downloads[key], reverse=True)

for dl in sorted_by_date: print downloads[dl]

print html_end