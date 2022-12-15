FROM node:18

# Create app directory
WORKDIR /opt/surf

# Install app dependencies
COPY package*.json ./

RUN npm ci --omit=dev

# Bundle app source
COPY . .

EXPOSE 8000
CMD npm start
