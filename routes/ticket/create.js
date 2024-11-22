const ticketService = require("../../services/TicketService");
const Permission = require("../../helpers/Permission");
const Response = require("../../helpers/Response");
const History = require("../../services/HistoryService");
const ObjectName = require("../../helpers/ObjectName");
const Request = require("../../lib/request");
const NotificationService = require("../../services/notifications/ticket");
const mediaService = require("../../services/media");
const { Media } = require("../../helpers/Media");
const { Media: MediaModal} = require('../../db').models;



const create = async (req, res) => {
  const hasPermission = await Permission.Has(Permission.TICKET_ADD, req);
 
  const company_id = Request.GetCompanyId(req);
  try{
  let data = await ticketService.create(req, res);

  if(data){
    res.json(200, {
      message: req?.params?.id ? "Ticket Cloned" : "Ticket Added",
      ticketDetails: data?.ticketDetails,
    });
    res.on("finish", async () => {
      let files = req.files.files && req.files.files.length > 0 ? req.files.files : req.files.files ?  [req.files.files] : []
    if(files && files.length > 0){
      for (let i = 0; i < files.length; i++) {
        const fileDetail = files[i];
        let imageData = {
          file_name: fileDetail?.name.trim(),
          name: fileDetail?.name.trim(),
          company_id: company_id,
          object_id: data && data?.ticketDetails?.id,
          object_name: ObjectName.TICKET,
          visibility: Media.VISIBILITY_PRIVATE
        }
        let mediaDetails = await MediaModal.create(imageData);
        if (mediaDetails) {
          await mediaService.uploadAudioFile(
            fileDetail?.path,
            mediaDetails?.id,
            fileDetail?.name,
            mediaDetails.visibility == Media.VISIBILITY_PUBLIC ? true : false,
          )
        }
      }

    }
      // Create system log for ticket creation
      if (data?.historyMessage && data?.historyMessage.length > 0) {
        let message = data?.historyMessage.join();
        History.create(`Created with the following: ${message}`, req, ObjectName.TICKET, data?.ticketDetails?.id);
      } else {
        History.create("Ticket Added", req, ObjectName.TICKET, data?.ticketDetails?.id);
      }
      await ticketService.reindex(data?.ticketDetails?.id, company_id);
      if (req?.body?.assignee_id) {
        NotificationService.sendTicketAssigneeNotification(data?.ticketDetails?.id, req?.user?.id);
        NotificationService.sendTicketAssigneePushNotification(data?.ticketDetails?.id,null,req)
      }
    });
  }

  }catch(error){
    return res.json(400, { message: error.message });
  }


};
module.exports = create;