FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/iotma
WORKDIR /usr/src/iot_predix

# Install app dependencies
COPY package.json /usr/src/iot_predix/
RUN npm install
# Bundle app source
COPY . /usr/src/iot_predix

EXPOSE 8080

CMD [ "node", "index.js"]

