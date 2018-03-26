package specs.app

import pages.app.AddEditProjectPage
import pages.app.HomePage
import pages.app.LoginPage

import pages.app.modal.EditRolesModal

import spock.lang.Unroll
import spock.lang.Title
import spock.lang.Stepwise

@Title("Functional tests for the EditRoles modal page")
@Stepwise
class EditRolesSpec extends LoggedInSpec {

  @Unroll
  def "Start on Page AddEditProjectPage, open modal: EditRolesModal, click Link: #ClickLink, Assert Page: #AssertPage"() {
    given: "I start on the AddEditProjectPage and open the modal EditRolesModal"
      to AddEditProjectPage
      page.EditRolesLink.click()
      page(EditRolesModal)
    when: "I click on the #ClickLink"
      assert modalModule.isOpen()
      page."$ClickLink".click()
      assert modalModule.isClosed()
    then: "I arrive on the #AssertPage page"
      at AssertPage
    where:
      ClickLink || AssertPage
      "XBtn"    || AddEditProjectPage
  }
}
