import http.server
import socketserver
import os
import webbrowser
import threading

PORT = 8000
DATA_FILE = 'resume_local_data.json'
FILE_NAME = 'resume_chatgpt_stable_clean_v9.html'

class LocalDiskHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # 阻断终端输出，保障静默运行
        
    def do_POST(self):
        if self.path == '/api/save_to_disk':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            with open(DATA_FILE, 'wb') as f:
                f.write(post_data)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"success"}')
        else:
            self.send_response(404)
            self.end_headers()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def start_server():
    with ReusableTCPServer(("", PORT), LocalDiskHandler) as httpd:
        httpd.serve_forever()

if __name__ == '__main__':
    # 延迟0.5秒调起系统默认浏览器，确保服务端口已挂载
    threading.Timer(0.5, lambda: webbrowser.open(f'http://localhost:{PORT}/{FILE_NAME}')).start()
    start_server()
