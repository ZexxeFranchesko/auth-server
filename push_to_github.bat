@echo off
set "GIT=C:\Program Files\Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe"
cd /d "C:\Users\zexxe\OneDrive\Desktop\quantix\Mxstafa Auth\server"

"%GIT%" init
"%GIT%" config user.name "ZexxeFranchesko"
"%GIT%" config user.email "zexxe@users.noreply.github.com"
"%GIT%" branch -M main
"%GIT%" remote remove origin 2>nul
"%GIT%" remote add origin https://github.com/ZexxeFranchesko/auth-server.git
"%GIT%" add .
"%GIT%" commit -m "Deploy Superonline Cloud Auth Server"
"%GIT%" push -u origin main
