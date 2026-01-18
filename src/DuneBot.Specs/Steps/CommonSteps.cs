using Reqnroll;
using Xunit;

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class CommonSteps
    {
        private readonly ScenarioContext _scenarioContext;

        public CommonSteps(ScenarioContext scenarioContext)
        {
            _scenarioContext = scenarioContext;
        }

        [Then(@"the action should fail with message ""(.*)""")]
        public void ThenTheActionShouldFailWithMessage(string expectedMessage)
        {
             var error = _scenarioContext.Get<System.Exception>("ErrorException");
             Assert.NotNull(error);
             Assert.Contains(expectedMessage, error.Message);
        }
    }
}
