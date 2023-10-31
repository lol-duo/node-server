FROM node:19-alpine

# Set the working directory to /app
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files to the container
COPY ./dist ./dist

# Copy the config files to the container
COPY ./tsconfig.json ./tsconfig.json

# Expose port 3000
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]