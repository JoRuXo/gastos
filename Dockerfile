FROM nginx:1.27-alpine
COPY index.html manifest.json sw.js icon-192.png icon-512.png /usr/share/nginx/html/
# El service worker no debe quedarse cacheado, o las actualizaciones no llegan
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location = /sw.js { add_header Cache-Control "no-cache"; }\n  location / { try_files $uri $uri/ /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
