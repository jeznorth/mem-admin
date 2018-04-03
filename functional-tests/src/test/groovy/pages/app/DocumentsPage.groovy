package pages.app

import geb.Browser
import pages.app.BaseAppPage

class DocumentsPage extends BaseAppPage {

  private def url

  DocumentsPage(project_name) {
    this.url = "/p/" + project_name + "/docs"
  }

  static at = { $("#documents-header").text().equals('Documents') && browser.getCurrentUrl().contains(url) }

  static content = {
    uploadFiles { $("#upload-files") }
    documentUploadHeader { $("#document-upload-modal-header") }
  }
}
