import { reviewedPlaceMentions } from './reviewed-place-mentions.js';

// Chapter 4, page 141 of the reference PDF. These are modern township
// reference points for the historical communes, not village coordinates.
const bozhouMentions = [
  {
    id: 'bozhou-shihe', name: '十河公社', modern: '十河镇', location: [115.705, 33.752], geonamesId: 1794836,
    text: '十河公社十河大队',
    summary: '亳县调查组在十河大队核查灾情。',
    context: '县委另选十河大队作调查点，梁志远派李运曾等人前往。原书转述的报告记下 1960 年 1 月 1 日至 5 月 15 日死亡 909 人，未查东关分支的三个生产队。同页还记有薛竹园村的情况。',
  },
  {
    id: 'bozhou-guantang', name: '观堂公社', modern: '观堂镇', location: [116.009, 33.801], geonamesId: 1809764,
    text: '仅观堂一个公社',
    summary: '梁志远的调查用观堂举例，说明当地有多少孩子失去父母。',
    context: '梁志远根据调查谈到亳县农村的灾情，杨继绳在这一段用观堂公社举例说明当地的孤儿情况。',
  },
  {
    id: 'bozhou-shibali', name: '十八里公社', modern: '十八里镇', location: [115.662, 33.866], geonamesId: 1795512,
    text: '十八里公社羊庙大队',
    summary: '书中记下羊庙大队幼儿园收养的孤儿后来怎样了。',
    context: '杨继绳记述羊庙大队幼儿园收养孤儿后的遭遇。同页还记有梁志远到十八里公社集南杨庄察看的情况。',
  },
  {
    id: 'bozhou-gucheng', name: '古城公社', modern: '古城镇', location: [115.780, 33.529], geonamesId: 1809605,
    text: '古城公社李腰小学',
    summary: '两名学生于 1960 年 3 月在课间死亡。',
    context: '杨继绳记述 1960 年 3 月古城公社李腰小学两名学生在课间死亡的事。',
  },
  {
    id: 'bozhou-weigang', name: '魏岗公社', modern: '魏岗镇', location: [115.658, 33.936], geonamesId: 1791675,
    text: '魏岗公社后孙湾生产队',
    summary: '后孙湾生产队的记录写到一家人如何失去亲人。',
    context: '这一段谈到饥荒中死去的人和失去亲人的孩子，其中一例发生在后孙湾生产队。',
  },
  {
    id: 'bozhou-wuma', name: '五马公社', modern: '五马镇', location: [115.872, 33.905], geonamesId: 1791077,
    text: '五马公社草寺大队彭小庄',
    summary: '书中写到归国华侨彭广胜夫妇在彭小庄的遭遇。',
    context: '杨继绳在这里记述彭小庄归国华侨彭广胜夫妇的遭遇。同页也提到五马公社其他生产队。',
  },
  {
    id: 'bozhou-shijiuli', name: '十九里公社', modern: '十九里镇', location: [115.831, 33.800], geonamesId: 1795248,
    text: '十九里公社明洼生产队',
    summary: '李琴丹的死因，书中记述和地方志的说法不同。',
    context: '杨继绳写到明洼生产队的李琴丹，并对照了《亳州市志》记载的死因。',
  },
  {
    id: 'bozhou-dayang', name: '大杨公社', modern: '大杨镇', location: [115.900, 33.683], geonamesId: 1813235,
    text: '大杨公社许洼生产队',
    summary: '书中写到许洼一名农妇如何设法领到稀饭。',
    context: '杨继绳记述许洼生产队一名农妇在家人去世后设法领取稀饭，维持自己和另一个孩子的生命。',
  },
].map(mention => ({ ...mention, area: '亳州', chapterId: '04', page: 141 }));

export const placeMentions = [...bozhouMentions, ...reviewedPlaceMentions];
