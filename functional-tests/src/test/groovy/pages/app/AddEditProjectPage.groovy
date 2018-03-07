package pages.app

import pages.app.BaseAppPage

class AddEditProjectPage extends BaseAppPage {
  static at = { pageTitle.text().startsWith("Edit Project") }
  static url = "/p/new/edit"
  static content = {
    pageTitle { $(".main-panel .view-title").$("h1") }

    EditRolesLink { $(".sidenav-group").$("a").has("span", text:"Edit Roles") }
    EditPermissionsLink { $(".sidenav-group").$("a").has("span", text:"Edit Permissions") }

    HeaderCancelBtn { $(".view-title").$("button", text:"Cancel") }
    HeaderSaveBtn { $(".view-title").$("button", text:"Save") }
    HeaderPublishProjectBtn { $(".view-title").$("button", text:"Publish Project") }

    FooterCancelBtn { $(".form-footer").$("button", text:"Cancel") }
    FooterSaveBtn { $(".form-footer").$("button", text:"Save") }
    FooterPublishProjectBtn { $(".form-footer").$("button", text:"Publish Project") }
  }
}
