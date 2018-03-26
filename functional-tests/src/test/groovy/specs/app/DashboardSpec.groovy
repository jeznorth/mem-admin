package specs.app

import pages.app.DashboardPage
import pages.app.HomePage
import pages.app.LoginPage
import pages.app.AddEditProjectPage

import spock.lang.Unroll
import spock.lang.Title
import spock.lang.Stepwise

@Title("Functional tests for the Dashboard page")
@Stepwise
class DashboardSpec extends LoggedInSpec {

  @Unroll
  def "Navigate Page from: DashboardPage, click Link: #ClickLink, Assert Page: #AssertPage"() {
    given: "I start on the DashboardPage"
      to DashboardPage
    when: "I click on the #ClickLink"
      page."$ClickLink".click()
    then: "I arrive on the #AssertPage page"
      at AssertPage
    where:
      ClickLink          || AssertPage
      "AddNewProjectBtn" || AddEditProjectPage
  }
}
