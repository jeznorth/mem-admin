package pages.app

import pages.app.BaseAppPage

class HomePage extends BaseAppPage {
  static at = { pageTitle.text().equals("News & Announcements") }
  static url = ""
  static content = {

    pageTitle { $(".main-panel .news-feed .panel-heading h2") }

    ViewAllNewsAnnouncementsBtn { $(".app-main .news-feed .panel-footer").$("a", text:"View all News & Announcements") }

    BrandBtn { headerModule.BrandBtn }
  }
}
