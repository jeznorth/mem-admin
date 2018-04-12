package pages.app

import pages.app.base.BaseAppPage

class NewsAnnouncementsPage extends BaseAppPage {
  static at = { pageTitle.text().equals("News & Announcements") }
  static url = "/admin/recentactivity/list"
  static content = {
    pageTitle { $(".view-title-container h1") }

    AddNewsAnnouncementsBtn { $(".button-bar").$("a").has("span", text:"Add News & Announcements") }
  }
}
