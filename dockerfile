FROM node:alpine
#RUN apt-get update && apt-get install -y procps
WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./

RUN npm install

# Copy the rest of the application code
COPY . .

EXPOSE 3002