package specs.app

import pages.app.modal.EditProfileModal
import pages.app.HomePage
import pages.app.NewsAnnouncementsPage
import pages.app.OrganizationsPage
import pages.app.LoginPage

import spock.lang.Unroll
import spock.lang.Title
import spock.lang.Stepwise

@Title("Functional tests for the EditProfile modal page")
@Stepwise
class EditProfileRolesSpec extends LoggedInSpec {
  
  @Unroll
  def "Start on Page #InitialPage, open modal: EditProfileModal, click Link: #ClickLink, Assert Page: #AssertPage"() {
    given: "I start on the #InitialPage and open the modal EditProfileModal"
      to InitialPage
      page(EditProfileModal)
      page.open()
    when: "I click on the #ClickLink"
      assert modalModule.isOpen()
      page."$ClickLink".click()
      assert modalModule.isClosed()
    then: "I arrive on the #AssertPage page"
      at AssertPage
    where:
      InitialPage           | ClickLink || AssertPage
      HomePage              | "XBtn"    || HomePage
      NewsAnnouncementsPage | "XBtn"    || NewsAnnouncementsPage
      OrganizationsPage     | "XBtn"    || OrganizationsPage
      //TODO could add every page, buy is probably redundant
  }
}
