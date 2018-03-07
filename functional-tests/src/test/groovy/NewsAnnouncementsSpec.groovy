import geb.spock.GebReportingSpec

import pages.app.NewsAnnouncementsPage
import pages.app.HomePage
import pages.app.LoginPage
import pages.app.AddEditRecentNewsPage

import spock.lang.Unroll
import spock.lang.Title
import spock.lang.Stepwise


@Title("Functional tests for the NewsAnnouncements page")
@Stepwise
class NewsAnnouncementsSpec extends GebReportingSpec {
  def setupSpec() {
    to LoginPage
    login("admin", System.getenv("ADMINPW"))
    to HomePage
  }

  @Unroll
  def "Navigate Page from: NewsAnnouncementsPage, click Link: #ClickLink, Assert Page: #AssertPage"() {
    given: "I start on the NewsAnnouncementsPage"
      to NewsAnnouncementsPage
    when: "I click on the #ClickLink"
      page."$ClickLink".click()
    then: "I arrive on the #AssertPage page"
      at AssertPage
    where:
      ClickLink                 || AssertPage
      "AddNewsAnnouncementsBtn" || AddEditRecentNewsPage
  }
}
