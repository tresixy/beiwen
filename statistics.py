#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import re
from collections import defaultdict
from pathlib import Path

class CodeStatistics:
    def __init__(self, root_dir):
        self.root_dir = Path(root_dir)
        self.file_stats = defaultdict(lambda: {'lines': 0, 'files': 0, 'functions': 0})
        self.tech_stack = set()
        self.exclude_dirs = {'node_modules', '.git', 'dist', 'build', 'logs', '__pycache__', '.venv', 'venv'}
        self.exclude_files = {'package-lock.json', '*.log'}
        self.binary_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.ogg', '.wav', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib', '.bin', '.pid'}
        self.code_extensions = {'.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h', '.hpp', '.cs', '.php', '.rb', '.swift', '.kt', '.scala', '.clj', '.sh', '.bash', '.zsh', '.sql', '.mjs', '.cjs'}
        self.doc_extensions = {'.md', '.txt', '.rst', '.adoc'}
        
    def is_excluded(self, path):
        parts = path.parts
        return any(part in self.exclude_dirs for part in parts)
    
    def count_functions(self, content, ext):
        """统计函数数量"""
        count = 0
        
        if ext in ['.js', '.jsx']:
            # JavaScript/JSX 函数模式
            patterns = [
                r'\bfunction\s+\w+\s*\([^)]*\)\s*\{',  # function name() {}
                r'\bconst\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{',  # const name = () => {}
                r'\bconst\s+\w+\s*=\s*(?:async\s+)?function\s*\([^)]*\)\s*\{',  # const name = function() {}
                r'\bexport\s+(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{',  # export function name() {}
                r'\bexport\s+const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{',  # export const name = () => {}
                r'\bclass\s+\w+',  # class Name
                r'^\s*\w+\s*:\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{',  # method: () => {}
                r'^\s*\w+\s*:\s*(?:async\s+)?function\s*\([^)]*\)\s*\{',  # method: function() {}
            ]
            for pattern in patterns:
                matches = re.findall(pattern, content, re.MULTILINE)
                count += len(matches)
            
        elif ext == '.sh':
            # Shell 函数
            pattern = r'^\s*\w+\s*\([^)]*\)\s*\{'
            count = len(re.findall(pattern, content, re.MULTILINE))
            
        elif ext == '.sql':
            # SQL 函数/存储过程
            pattern = r'CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE)\s+\w+'
            count = len(re.findall(pattern, content, re.IGNORECASE | re.MULTILINE))
            
        elif ext == '.py':
            # Python 函数
            patterns = [
                r'^\s*def\s+\w+\s*\([^)]*\)\s*:',  # def name():
                r'^\s*class\s+\w+',  # class Name
                r'^\s*async\s+def\s+\w+\s*\([^)]*\)\s*:',  # async def name():
            ]
            for pattern in patterns:
                matches = re.findall(pattern, content, re.MULTILINE)
                count += len(matches)
        
        return count
    
    def analyze_file(self, file_path):
        """分析单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            ext = file_path.suffix.lower()
            lines = len(content.splitlines())
            functions = self.count_functions(content, ext)
            
            return ext, lines, functions
        except Exception as e:
            return None, 0, 0
    
    def detect_tech_stack(self):
        """检测技术栈"""
        # 从 package.json 检测
        package_files = [
            self.root_dir / 'package.json',
            self.root_dir / 'client' / 'package.json',
            self.root_dir / 'template-react' / 'package.json',
        ]
        
        for pkg_file in package_files:
            if pkg_file.exists():
                try:
                    import json
                    with open(pkg_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        
                    # 检测依赖
                    deps = data.get('dependencies', {})
                    dev_deps = data.get('devDependencies', {})
                    all_deps = {**deps, **dev_deps}
                    
                    # 识别关键技术栈
                    tech_mapping = {
                        'express': 'Express.js',
                        'react': 'React',
                        'react-dom': 'React',
                        'phaser': 'Phaser.js',
                        'socket.io': 'Socket.io',
                        'vite': 'Vite',
                        'pg': 'PostgreSQL',
                        'redis': 'Redis',
                        'pino': 'Pino',
                        'jsonwebtoken': 'JWT',
                        'argon2': 'Argon2',
                        'openai': 'OpenAI API',
                        'zod': 'Zod',
                        'cors': 'CORS',
                        'helmet': 'Helmet',
                        'compression': 'Compression',
                        'dotenv': 'dotenv',
                        'nanoid': 'NanoID',
                    }
                    
                    for dep, tech in tech_mapping.items():
                        if dep in all_deps:
                            self.tech_stack.add(tech)
                except:
                    pass
        
        # 从 docker-compose.yml 检测
        docker_file = self.root_dir / 'docker-compose.yml'
        if docker_file.exists():
            self.tech_stack.add('Docker')
            try:
                with open(docker_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'postgres' in content.lower():
                        self.tech_stack.add('PostgreSQL')
                    if 'redis' in content.lower():
                        self.tech_stack.add('Redis')
            except:
                pass
        
        # 从文件扩展名检测
        for ext, stats in self.file_stats.items():
            if ext == '.jsx':
                self.tech_stack.add('React')
            elif ext == '.sh':
                self.tech_stack.add('Shell Script')
            elif ext == '.sql':
                self.tech_stack.add('SQL')
            elif ext == '.css':
                self.tech_stack.add('CSS')
            elif ext == '.html':
                self.tech_stack.add('HTML')
    
    def scan_directory(self):
        """扫描目录"""
        for root, dirs, files in os.walk(self.root_dir):
            root_path = Path(root)
            
            # 过滤排除目录
            dirs[:] = [d for d in dirs if d not in self.exclude_dirs]
            
            for file in files:
                file_path = root_path / file
                
                if self.is_excluded(file_path):
                    continue
                
                # 跳过排除的文件
                if any(file_path.match(pattern) for pattern in self.exclude_files):
                    continue
                
                # 跳过二进制文件
                if file_path.suffix.lower() in self.binary_extensions:
                    continue
                
                ext, lines, functions = self.analyze_file(file_path)
                
                if ext:
                    ext_key = ext if ext else 'no_ext'
                    self.file_stats[ext_key]['lines'] += lines
                    self.file_stats[ext_key]['files'] += 1
                    self.file_stats[ext_key]['functions'] += functions
    
    def generate_report(self):
        """生成报告"""
        self.scan_directory()
        self.detect_tech_stack()
        
        print("=" * 60)
        print("代码统计报告")
        print("=" * 60)
        print()
        
        # 代码行数统计（仅代码文件）
        print("【代码行数统计（代码文件）】")
        print("-" * 60)
        code_lines = 0
        code_files = 0
        code_functions = 0
        
        # 按扩展名排序
        sorted_stats = sorted(self.file_stats.items(), key=lambda x: x[1]['lines'], reverse=True)
        
        for ext, stats in sorted_stats:
            if stats['lines'] > 0 and ext in self.code_extensions:
                ext_name = ext if ext else '(无扩展名)'
                print(f"{ext_name:15} | 文件数: {stats['files']:4} | 代码行数: {stats['lines']:6} | 函数数: {stats['functions']:4}")
                code_lines += stats['lines']
                code_files += stats['files']
                code_functions += stats['functions']
        
        print("-" * 60)
        print(f"{'代码总计':15} | 文件数: {code_files:4} | 代码行数: {code_lines:6} | 函数数: {code_functions:4}")
        print()
        
        # 配置文件和其他文件统计
        print("【配置文件和其他文件统计】")
        print("-" * 60)
        config_lines = 0
        config_files = 0
        
        for ext, stats in sorted_stats:
            if stats['lines'] > 0 and ext not in self.code_extensions and ext not in self.doc_extensions:
                ext_name = ext if ext else '(无扩展名)'
                print(f"{ext_name:15} | 文件数: {stats['files']:4} | 行数: {stats['lines']:6}")
                config_lines += stats['lines']
                config_files += stats['files']
        
        if config_files > 0:
            print("-" * 60)
            print(f"{'配置总计':15} | 文件数: {config_files:4} | 行数: {config_lines:6}")
        print()
        
        # 文档文件统计
        print("【文档文件统计】")
        print("-" * 60)
        doc_lines = 0
        doc_files = 0
        
        for ext, stats in sorted_stats:
            if stats['lines'] > 0 and ext in self.doc_extensions:
                ext_name = ext if ext else '(无扩展名)'
                print(f"{ext_name:15} | 文件数: {stats['files']:4} | 行数: {stats['lines']:6}")
                doc_lines += stats['lines']
                doc_files += stats['files']
        
        if doc_files > 0:
            print("-" * 60)
            print(f"{'文档总计':15} | 文件数: {doc_files:4} | 行数: {doc_lines:6}")
        print()
        
        # 总计
        total_lines = code_lines + config_lines + doc_lines
        total_files = code_files + config_files + doc_files
        total_functions = code_functions
        
        # 函数数量统计
        print("【函数数量统计】")
        print("-" * 60)
        print(f"总函数数: {total_functions}")
        print()
        
        # 技术栈统计
        print("【技术栈统计】")
        print("-" * 60)
        print(f"技术栈数量: {len(self.tech_stack)}")
        print("使用的技术栈:")
        for tech in sorted(self.tech_stack):
            print(f"  - {tech}")
        print()
        
        print("=" * 60)

if __name__ == '__main__':
    import sys
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    stats = CodeStatistics(root)
    stats.generate_report()

