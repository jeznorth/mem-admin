package specs.app

import pages.app.AddEditProjectPage
import pages.app.ProjectPage
import pages.app.DocumentsPage

class UploadDocumentSpec extends LoggedInSpec {

  def projectName = "test project"
  def convertedProjectName = "test-project"

  def "Navigate to project page, upload project"() {
    given: "I creat a project and navigate to it"
      to AddEditProjectPage
      page.projectName.value(projectName)
      page.saveProject.click()// TODO: adjust this test to use a fixture for the porject - challenging because of authorization requirements

      to ProjectPage, convertedProjectName, "detail"
    when: "I click on the document upload glyph"
      page.documentsLink.click()
      at new DocumentsPage(projectName)
      uploadFiles.click()
      modalModule.isOpen();
    then: "I arrive on the #AssertPage page"
      page.documentUploadHeader
  }
}
