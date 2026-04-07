# Stage 1: Build Angular app
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration production

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built Angular files
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Custom nginx config for Angular SPA + API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
