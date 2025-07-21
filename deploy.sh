#!/bin/bash

# 🚀 3D Portfolio 網站部署腳本
# 使用方法：./deploy.sh [github|vercel|netlify]

echo "🌟 3D Portfolio 部署腳本"
echo "=============================="

# 檢查參數
if [ $# -eq 0 ]; then
    echo "📋 可用的部署選項："
    echo "  1. GitHub Pages  - ./deploy.sh github"
    echo "  2. Vercel        - ./deploy.sh vercel"  
    echo "  3. Netlify       - ./deploy.sh netlify"
    echo ""
    echo "💡 推薦使用 GitHub Pages (免費且穩定)"
    exit 1
fi

PLATFORM=$1

case $PLATFORM in
    "github")
        echo "🐙 準備部署到 GitHub Pages..."
        
        # 檢查是否已初始化 Git
        if [ ! -d ".git" ]; then
            echo "📦 初始化 Git 倉庫..."
            git init
            git branch -M main
        fi
        
        # 添加所有檔案
        echo "📁 添加檔案到 Git..."
        git add .
        
        # 提交變更
        echo "💾 提交變更..."
        git commit -m "Deploy 3D Portfolio - $(date '+%Y-%m-%d %H:%M:%S')"
        
        # 檢查是否設定了遠端倉庫
        if ! git remote get-url origin > /dev/null 2>&1; then
            echo "⚠️  請先設定 GitHub 遠端倉庫："
            echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
            echo ""
            echo "📖 詳細步驟請參考 DEPLOYMENT.md"
            exit 1
        fi
        
        # 推送到 GitHub
        echo "🚀 推送到 GitHub..."
        git push -u origin main
        
        echo "✅ 部署完成！"
        echo "🌐 您的網站將在 5-10 分鐘後可用"
        echo "📍 網址：https://YOUR_USERNAME.github.io/YOUR_REPO"
        ;;
        
    "vercel")
        echo "⚡ 準備部署到 Vercel..."
        
        # 檢查是否安裝了 Vercel CLI
        if ! command -v vercel &> /dev/null; then
            echo "📦 安裝 Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "🚀 部署到 Vercel..."
        vercel --prod
        
        echo "✅ 部署完成！"
        ;;
        
    "netlify")
        echo "🎯 準備部署到 Netlify..."
        
        # 檢查是否安裝了 Netlify CLI
        if ! command -v netlify &> /dev/null; then
            echo "📦 安裝 Netlify CLI..."
            npm install -g netlify-cli
        fi
        
        echo "🚀 部署到 Netlify..."
        netlify deploy --prod --dir .
        
        echo "✅ 部署完成！"
        ;;
        
    *)
        echo "❌ 不支援的平台：$PLATFORM"
        echo "📋 支援的平台：github, vercel, netlify"
        exit 1
        ;;
esac

echo ""
echo "🎉 恭喜！您的 3D 作品集網站已成功部署"
echo "📖 如需更多資訊，請查看 DEPLOYMENT.md"
