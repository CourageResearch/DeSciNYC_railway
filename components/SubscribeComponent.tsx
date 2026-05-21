import HorizontalLines from "./ui/HorizontalLines";
import MailingListForm from "./MailingListForm";

const SubscribeComponent = () => {
  return (
    <div
      className="relative w-full bg-gradient-to-b from-[#0d230d] to-black"
      id="subscribe"
    >
      <HorizontalLines />
      <div className="max-w-[1100px] mx-auto flex flex-col items-center justify-center">
        <div className="flex flex-col gap-4 my-20 md:my-40 bg-gradient-to-b from-transparent via-[#0fa711] to-transparent px-4 md:px-8 py-12">
          <h3 className="text-stone-200 uppercase text-5xl font-medium font-Jersey15">
            Subscribe to mailing list
          </h3>
          <p className="w-full md:w-2/3 text-stone-200 font-semibold">
            About once a month, we send out an email with the latest news,
            events, and updates from the decentralized science community in NYC
          </p>
          <MailingListForm className="w-full md:w-2/3" />
        </div>
      </div>
    </div>
  );
};

export default SubscribeComponent;
