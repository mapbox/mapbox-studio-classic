@ECHO OFF
SETLOCAL
SET EL=0

ECHO ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ %~f0 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

ECHO original PLATFORM^: %platform%
::sometimes platform is lower case on AppVeyor
IF "%platform%"=="X64" SET platform=x64
ECHO modified PLATFORM^: %platform%

ECHO HOME^: %HOME%
SET PATH=%HOME%;%PATH%

IF NOT DEFINED SKIP_DL SET SKIP_DL=0
IF %SKIP_DL% EQU 1 ECHO SKIPPING DOWNLOAD && GOTO RUN_INSTALL

::delete default node.exe to avoid conflicts
FOR /F "tokens=*" %%i in ('node -e "console.log(process.execPath)"') do SET NODE_EXE_PATH=%%i
IF %ERRORLEVEL% NEQ 0 GOTO ERROR
ECHO deleting node.exe^: %NODE_EXE_PATH%

IF EXIST %NODE_EXE_PATH% DEL /Q %NODE_EXE_PATH%
IF %ERRORLEVEL% NEQ 0 GOTO ERROR

::download custom mapbox node.exe
SET ARCHPATH=
IF "%platform%"=="x64" SET ARCHPATH=x64/
SET NODE_URL=https://mapbox.s3.amazonaws.com/node-cpp11/v%NODE_VERSION%/%ARCHPATH%node.exe
ECHO fetching %NODE_URL%
powershell Invoke-WebRequest $env:NODE_URL -OutFile $env:HOME\node.exe
IF %ERRORLEVEL% NEQ 0 GOTO ERROR

IF EXIST "%ProgramFiles(x86)%\nodejs\node.exe" ECHO found "%ProgramFiles(x86)%\nodejs\node.exe" && DEL /Q "%ProgramFiles(x86)%\nodejs\node.exe"
IF %ERRORLEVEL% NEQ 0 GOTO ERROR
IF EXIST "%ProgramFiles%\nodejs\node.exe" ECHO found "%ProgramFiles%\nodejs\node.exe" && DEL /Q "%ProgramFiles%\nodejs\node.exe"
IF %ERRORLEVEL% NEQ 0 GOTO ERROR

IF EXIST "%ProgramFiles(x86)%\nodejs" ECHO copying node.exe to "%ProgramFiles(x86)%\nodejs" && COPY node.exe "%ProgramFiles(x86)%\nodejs\"
IF %ERRORLEVEL% NEQ 0 GOTO ERROR
IF EXIST "%ProgramFiles%\nodejs" ECHO copying node.exe to "%ProgramFiles%\nodejs" && COPY node.exe "%ProgramFiles%\nodejs\"
IF %ERRORLEVEL% NEQ 0 GOTO ERROR

WHERE node

:RUN_INSTALL

node -v
IF %ERRORLEVEL% NEQ 0 GOTO ERROR
node -e "console.log(process.argv,process.execPath,process.arch)"
IF %ERRORLEVEL% NEQ 0 GOTO ERROR
CALL npm -v
IF %ERRORLEVEL% NEQ 0 GOTO ERROR

CALL npm install --fallback-to-build=false --toolset=v140
IF %ERRORLEVEL% NEQ 0 ECHO npm install failed && GOTO ERROR

CD node_modules\mapnik
IF %ERRORLEVEL% NEQ 0 GOTO ERROR
FOR /F "tokens=*" %%i in ('CALL ..\..\node_modules\.bin\node-pre-gyp reveal module_path --silent') do SET BINDING_DIR=%%i
IF %ERRORLEVEL% NEQ 0 GOTO ERROR
ECHO BINDING_DIR^: %BINDING_DIR%

CD ..\..
IF %ERRORLEVEL% NEQ 0 GOTO ERROR

ECHO ==== TODO ====
ECHO ==== remove when updated phantomjs package is availble
ECHO ==== currently there is no binary for Linux
ECHO ==== so, node package is stuck at 1.9

IF NOT EXIST phantom.7z ECHO downloading phantom.exe 2.0.0 && powershell Invoke-WebRequest https://mapbox.s3.amazonaws.com/windows-builds/windows-deps/phantomjs-2.0.0.7z -OutFile $env:HOME\phantom.7z
IF %ERRORLEVEL% NEQ 0 GOTO ERROR

7z -y x phantom.7z -o%HOME%\node_modules\phantomjs\lib\phantom\ | %windir%\system32\FIND "ing archive"
IF %ERRORLEVEL% NEQ 0 GOTO ERROR

::put dumpbin on path: required by check_shared_libs.py
SET PATH=C:\Program Files (x86)\Microsoft Visual Studio 14.0\VC\bin;%PATH%
python test\check_shared_libs.py .\
IF %ERRORLEVEL% NEQ 0 ECHO ========== TODO ENABLE AGAIN ======== error during "python test\check_shared_libs.py .\"
::IF %ERRORLEVEL% NEQ 0 ECHO error during "python test\check_shared_libs.py .\" && GOTO ERROR

::run tests
CALL npm test
IF %ERRORLEVEL% NEQ 0 ECHO error during "npm test" && GOTO ERROR
node test/test-client.js
IF %ERRORLEVEL% NEQ 0 ECHO error during "node test/test-client.js" && GOTO ERROR


GOTO DONE

:ERROR
SET EL=%ERRORLEVEL%
ECHO ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ERROR^: %~f0 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ECHO ERRORLEVEL^: %EL%

:DONE
ECHO ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ DONE %~f0 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
CD %HOME%
EXIT /b %EL%
