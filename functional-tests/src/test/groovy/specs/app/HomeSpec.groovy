package specs.app

import pages.app.HomePage
import pages.app.NewsPage
import pages.app.OrganizationsPage
import pages.app.NewsAnnouncementsPage
import pages.app.ContactsPage
import pages.app.LoginPage

import pages.app.modal.EditSystemRolesModal
import pages.app.modal.EditSystemPermissionsModal
import pages.app.modal.EditProfileModal

import pages.external.ExternalLinkPage

import modules.FooterModule
import spock.lang.Unroll
import spock.lang.Title
import spock.lang.Stepwise

@Title("Functional tests for the Home page")
@Stepwise
class HomeSpec extends LoggedInSpec {

  @Unroll
  def "Navigate Page from: HomePage, click Link: #ClickLink, Assert Page: #AssertPage"() {
    given: "I start on the HomePage"
      sleep(1000)
      to HomePage
    when: "I click on the link #ItemSelector -> #SubItemSelector"
      headerModule.clickMenuItem(ItemSelector, SubItemSelector)
    then: "I arrive on the #AssertPage page"
      at AssertPage
    where:
      ItemSelector              | SubItemSelector                    || AssertPage
      [text : "HOME"]           |  null                              || HomePage
      [text : "DASHBOARD"]      |  null                              || HomePage
      [text : "SYSTEM"]         | [text : "Organizations"]           || OrganizationsPage
      [text : "SYSTEM"]         | [text : "News & Announcements"]    || NewsAnnouncementsPage
      [text : "SYSTEM"]         | [text : "Contacts"]                || ContactsPage
      [text : "SYSTEM"]         | [text : "Edit System Roles"]       || EditSystemRolesModal
      [text : "SYSTEM"]         | [text : "Edit System Permissions"] || EditSystemPermissionsModal
      [text : "ADMIN LOCAL"]    | [text : "Edit Profile"]            || EditProfileModal
      [text : "ADMIN LOCAL"]    | [text : "Logout"]                  || HomePage
      //TODO [text : "LOG IN"]         |  null                              || LoginSiteminderPage
  }

  @Unroll
  def "Navigate Page from: HomePage, click Link: #ClickLink, Assert Page: #AssertPage"() {
    given: "I start on the HomePage"
      to HomePage
    when: "I click on the #ClickLink"
      page."$ClickLink".click()
    then: "I arrive on the #AssertPage page"
      at AssertPage
    where:
      ClickLink                     || AssertPage
      "BrandBtn"                    || HomePage
      "ViewAllNewsAnnouncementsBtn" || NewsPage
  }

  @Unroll
  def "Navigate Page from: HomePage, click footer Link: #ClickLink, Assert Page: #AssertPage"() {
    given: "I start on the HomePage"
      to HomePage
    when: "I click on the #ClickLink"
      footerModule."$ClickLink".click()
    then: "I arrive on the #AssertPage page"
      at AssertPage
    where:
      ClickLink             || AssertPage
      "HomeLink"            || HomePage
      "CopyrightLink"       || new ExternalLinkPage("Copyright - Province of British Columbia", "gov.bc.ca")
      "DisclaimerLink"      || new ExternalLinkPage("Disclaimer - Province of British Columbia", "gov.bc.ca")
      "PrivacyLink"         || new ExternalLinkPage("B.C. Government Website Privacy Statement - Province of British Columbia", "gov.bc.ca")
      "AccessibilityLink"   || new ExternalLinkPage("Web Accessibility - Province of British Columbia", "gov.bc.ca")
      //TODO "LogInSiteminderLink" || LoginSiteminderPage
      "LogInLocalLink"      || LoginPage

  }
}
