module.exports.handler = async (event, context) => {
  //   const body = JSON.parse(event.body);

  const body = JSON.parse(event.requestContext);
  console.log(JSON.stringify(body, null, 4));

  return {
    statusCode: 200,
    body: `Hello, ${body.name}`,
  };
};
