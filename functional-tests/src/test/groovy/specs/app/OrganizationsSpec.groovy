package specs.app

import pages.app.OrganizationsPage
import pages.app.HomePage
import pages.app.LoginPage
import pages.app.AddEditOrganizationPage

import spock.lang.Unroll
import spock.lang.Title
import spock.lang.Stepwise

@Title("Functional tests for the Organizations page")
@Stepwise
class OrganizationsSpec extends LoggedInSpec {

  @Unroll
  def "Navigate Page from: OrganizationsPage, click Link: #ClickLink, Assert Page: #AssertPage"() {
    given: "I start on the OrganizationsPage"
      to OrganizationsPage
    when: "I click on the #ClickLink"
      page."$ClickLink".click()
    then: "I arrive on the #AssertPage page"
      at AssertPage
    where:
      ClickLink             || AssertPage
      "AddOrganizationsBtn" || AddEditOrganizationPage
  }
}
