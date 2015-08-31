@ECHO OFF
SETLOCAL

ECHO ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ %~f0 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

ECHO CWD^: %CD%

SET SKIP_DL=1
SET HOME=%CD%
SET NODE_VERSION=0.12.7
SET platform=x64


:: OVERRIDE PARAMETERS
:NEXT_ARG

IF '%1'=='' GOTO ARGS_DONE
ECHO setting %1
SET %1
SHIFT
GOTO NEXT_ARG

:ARGS_DONE


SET PATH=C:\Python27;%PATH%
SET PATH=C:\Program Files\7-Zip;%PATH%

CALL %HOME%\scripts\build-appveyor.bat
IF %ERRORLEVEL% NEQ 0 ECHO error during "build-appveyor.bat" && GOTO ERROR


GOTO DONE


:ERROR
SET EL=%ERRORLEVEL%
ECHO ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ERROR^: %~f0 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ECHO ERRORLEVEL^: %EL%

:DONE
ECHO ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ DONE %~f0 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
CD %HOME%
EXIT /b %EL%
