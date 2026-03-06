fetch("scenes.json")
  .then(res => res.json())
  .then(data => {

    pannellum.viewer('viewer', {
      default: {
        firstScene: "gate",
        sceneFadeDuration: 1000
      },
      scenes: data
    });

  });