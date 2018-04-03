package specs.app

import pages.app.AddEditProjectPage
import pages.app.DashboardPage
import pages.app.HomePage
import pages.app.LoginPage

import pages.app.modal.EditRolesModal
import pages.app.modal.EditPermissionsModal

import spock.lang.Unroll
import spock.lang.Title
import spock.lang.Stepwise

@Title("Functional tests for the AddEditProject page")

@Stepwise
class AddEditProjectSpec extends LoggedInSpec {

  @Unroll
  def "Navigate Page from: AddEditProjectPage, click Link: #ClickLink, Assert Page: #AssertPage"() {
    given: "I start on the AddEditProjectPage"
      to AddEditProjectPage
    when: "I click on the #ClickLink"
      page."$ClickLink".click()
    then: "I arrive on the #AssertPage page"
      at AssertPage
    where:
      ClickLink             || AssertPage
      "EditRolesLink"       || EditRolesModal
      "EditPermissionsLink" || EditPermissionsModal
      "HeaderCancelBtn"     || HomePage
      "FooterCancelBtn"     || HomePage
  }

  def "Add a project"() {
    given: "I start on the AddEditProjectPage"
      to AddEditProjectPage
    when: "I populate the fields required for save and click the save button"
      def testProjectName = "test project"
      page.projectName.value(testProjectName)
      page.saveProject.click()
      to DashboardPage
    then:
      page.getRowCount() == 2 //one for the project row, one for the no record row
      page.getProjectName(page.getRowAtIndex(0)).text() == testProjectName
  }
}
