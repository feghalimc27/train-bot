FROM node

COPY . /bot
RUN echo "npm install" > /bot/startup.sh && \
    echo "npm run register" > /bot/startup.sh && \
    echo "npm run start" > /bot/startup.sh
WORKDIR /bot

CMD [ "sh", "startup.sh" ]