import Image from 'next/image';

interface CommentCardProps {
  author: string;
  avatarUrl: string;
  text: string;
}

export function CommentCard({ author, avatarUrl, text }: CommentCardProps) {
  return (
    <div className="flex items-start space-x-4">
      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
        <Image src={avatarUrl} alt={author} layout="fill" objectFit="cover" />
      </div>
      <div className="card-glass border-l-2 border-slate-600 p-4 rounded-lg flex-grow">
        <p className="font-bold text-slate-200">{author}</p>
        <p className="text-slate-300 text-sm mt-1">"{text}"</p>
      </div>
    </div>
  );
}