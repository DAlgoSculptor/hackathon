import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      botToken,
      channelId,
      applicantName,
      applicantEmail,
      companyName,
      companyWebsite,
      pdfBase64
    } = await req.json();

    if (!botToken || !channelId) {
      return NextResponse.json(
        { error: "Discord Bot Token and Channel ID are required." },
        { status: 400 }
      );
    }

    if (!applicantName || !applicantEmail) {
      return NextResponse.json(
        { error: "Applicant name and email address are required." },
        { status: 400 }
      );
    }

    if (!pdfBase64) {
      return NextResponse.json(
        { error: "PDF report file is required." },
        { status: 400 }
      );
    }

    // Convert base64 to binary blob
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const blob = new Blob([pdfBuffer], { type: "application/pdf" });

    // Prepare Discord message data using multipart/form-data
    const formData = new FormData();
    const fileName = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_research_report.pdf`;
    
    // Append the file
    formData.append("files[0]", blob, fileName);

    // Append JSON message metadata
    const payload = {
      content: `📊 **New Company Research Report Generated**\n\n` +
               `👤 **Applicant Details:**\n` +
               `• **Name:** ${applicantName}\n` +
               `• **Email:** ${applicantEmail}\n\n` +
               `🏢 **Research Details:**\n` +
               `• **Company:** ${companyName}\n` +
               `• **Website:** ${companyWebsite || "Not listed"}\n\n` +
               `*The generated PDF report is attached below.*`
    };
    formData.append("payload_json", JSON.stringify(payload));

    // Send post request to Discord API
    const discordRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`
      },
      body: formData
    });

    if (!discordRes.ok) {
      const errorText = await discordRes.text();
      console.error("Discord API response error:", errorText);
      return NextResponse.json(
        { error: `Discord bot API returned error: ${errorText}` },
        { status: discordRes.status }
      );
    }

    const result = await discordRes.json();
    return NextResponse.json({ success: true, messageId: result.id });
  } catch (error: any) {
    console.error("Discord routing error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during Discord dispatch." },
      { status: 500 }
    );
  }
}
