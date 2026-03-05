FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json only
COPY package.json ./

# Install dependencies with npm
RUN npm install --legacy-peer-deps && \
    npm install ajv@8 ajv-keywords@5 --legacy-peer-deps

# Copy source code
COPY . .

# Set the backend URL for production build
ARG REACT_APP_BACKEND_URL=https://srpskoudruzenjetaby.se
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

# Build with production optimizations
ENV NODE_ENV=production \
    GENERATE_SOURCEMAP=false \
    INLINE_RUNTIME_CHUNK=false

RUN npm run build

# Production stage - minimal nginx image
FROM nginx:alpine

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config for SPA routing with caching
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml image/svg+xml;

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Don't cache HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
