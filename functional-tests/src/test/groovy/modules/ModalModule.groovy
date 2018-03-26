package modules

import geb.Module

import modules.HeaderModule

/**
 * Contains objects and methods for interacting with the modal pages.
 */
class ModalModule extends Module {
  static content = {
    modalWindow(required: false) { $(".modal-dialog") }
  }

  boolean isOpen() {
    return waitFor { modalWindow.displayed }
  }

  boolean isClosed() {
    return waitFor { modalWindow.displayed == false }
  }
}
