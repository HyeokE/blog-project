import { format } from 'date-fns';
import { motion } from 'motion/react';

type PostThumbnailProps = {
  date: string;
  title: string;
  onClose: () => void;
};

const PostThumbnail = ({ date, title }: PostThumbnailProps) => {
  return (
    <motion.div
      key="thumbnail"
      className="bg-background fixed inset-0 z-50 flex h-[100dvh] w-[100dvw] items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: {
          duration: 0.15,
          ease: 'easeInOut',
        },
      }}
      exit={{ opacity: 0 }}
    >
      <motion.div className="flex flex-col items-center justify-center gap-3">
        <motion.p className="text-foreground text-sm" layoutId={date}>
          {format(date, 'yyyy.MM.dd')}
        </motion.p>
        <motion.h2 className="text-foreground text-center text-2xl font-bold" layoutId={title}>
          {title}
        </motion.h2>
      </motion.div>
    </motion.div>
  );
};

export default PostThumbnail;
