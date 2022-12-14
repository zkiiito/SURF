FROM node:18-alpine

# Create app directory
WORKDIR /opt/surf

# Install app dependencies
COPY package*.json ./

RUN npm install --only=production

# Bundle app source
COPY . .

EXPOSE 8000
CMD npm start
