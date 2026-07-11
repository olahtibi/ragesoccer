function createIndividualAiCommandRegistry() {
  return {
    inactive: new InactiveCommand(),
    moveToPosition: new MoveToPositionCommand(),
    attackBall: new AttackBallCommand()
  };
}
