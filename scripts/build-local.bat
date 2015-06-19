@ECHO OFF

ECHO CD^: %CD%

SET SKIP_DL=1
SET HOME=c:\projects\tm2
SET NODE_VERSION=0.10.33
SET platform=x64

SET PATH=C:\Python27\ArcGIS10.2;%PATH%
SET PATH=C:\Program Files\7-Zip;%PATH%

CALL %HOME%\scripts\build-appveyor.bat
