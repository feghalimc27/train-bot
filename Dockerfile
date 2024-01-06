FROM node

COPY . /bot
RUN echo "npm run start" > /bot/startup.sh
WORKDIR /bot

CMD [ "sh", "startup.sh" ]