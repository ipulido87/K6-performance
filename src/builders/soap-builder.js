import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";
import { openFromRoot } from "../utils/files.js";
import { byteSize, toBytes } from "../utils/formatters.js";

export class SoapBuilder {
  constructor(config) {
    this.baseTemplate = openFromRoot(config.baseTemplate);
    this.activityTemplate = config.activityTemplate
      ? openFromRoot(config.activityTemplate)
      : "";

    if (!this.baseTemplate) {
      throw new Error("Base template is required");
    }
  }

  buildWithActivities(activityCount = 1) {
    let message = this.replaceGuids(this.baseTemplate);

    if (message.includes("{{ACTIVITIES_BLOCK}}")) {
      const activities = this.activityTemplate
        ? this.activityTemplate.repeat(Math.max(1, activityCount))
        : "";

      message = message.replace("{{ACTIVITIES_BLOCK}}", activities);
    }

    return message;
  }

  buildWithTargetSize(targetMB) {
    if (!this.activityTemplate) {
      throw new Error("Activity template required for size-based building");
    }

    const targetBytes = toBytes(targetMB);
    let message = this.replaceGuids(this.baseTemplate);

    const baseOnly = message.replace("{{ACTIVITIES_BLOCK}}", "");
    const overhead = byteSize(baseOnly);

    const budget = targetBytes - overhead;
    if (budget <= 0) {
      return baseOnly;
    }

    const activitySize = byteSize(this.activityTemplate);
    const repeatCount = Math.max(1, Math.floor(budget / activitySize));

    const activities = this.activityTemplate.repeat(repeatCount);
    message = message.replace("{{ACTIVITIES_BLOCK}}", activities);

    return message;
  }

  buildSimple() {
    let message = this.replaceGuids(this.baseTemplate);

    if (message.includes("{{ACTIVITIES_BLOCK}}")) {
      const activities = this.activityTemplate || "";
      message = message.replace("{{ACTIVITIES_BLOCK}}", activities);
    }

    return message;
  }

  replaceGuids(template) {
    return template
      .replaceAll("{{myGUID}}", uuidv4())
      .replaceAll("{{myGUID2}}", uuidv4());
  }

  estimateSize(activityCount = 1) {
    const message = this.buildWithActivities(activityCount);
    return byteSize(message);
  }
}

export function createSoapBuilder(config) {
  return new SoapBuilder({
    baseTemplate: config.soapTemplates.base,
    activityTemplate: config.soapTemplates.activity,
  });
}
