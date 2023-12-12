import { BaseCache } from '@service/redis/base.cache';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import {
  ISavePostToCache,
  IPostDocument,
} from '@post/interfaces/post.interface';
import { Helpers } from '@global/helpers/helpers';
import { RedisCommandRawReply } from '@redis/client/dist/lib/commands';
import { IReactions } from '@reaction/interfaces/reaction.interface';

const log: Logger = config.createLogger('postCache');

export type PostCacheMultiType =
  | string
  | number
  | Buffer
  | RedisCommandRawReply[]
  | IPostDocument
  | IPostDocument[];

export class PostCache extends BaseCache {
  constructor() {
    super('postCache');
  }

  public async savePostToCache(data: ISavePostToCache): Promise<void> {
    const { key, currentUserId, uId, createdPost } = data;
    const {
      _id,
      userId,
      username,
      email,
      avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount,
      imgVersion,
      imgId,
      videoId,
      videoVersion,
      reactions,
      createdAt,
    } = createdPost;

    const dataToSave = {
      _id: `${_id}`,
      userId: `${userId}`,
      username: `${username}`,
      email: `${email}`,
      avatarColor: `${avatarColor}`,
      profilePicture: `${profilePicture}`,
      post: `${post}`,
      bgColor: `${bgColor}`,
      feelings: `${feelings}`,
      privacy: `${privacy}`,
      gifUrl: `${gifUrl}`,
      commentsCount: `${commentsCount}`,
      reactions: JSON.stringify(reactions),
      imgVersion: `${imgVersion}`,
      imgId: `${imgId}`,
      videoId: `${videoId}`,
      videoVersion: `${videoVersion}`,
      createdAt: `${createdAt}`,
    };

    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      const postCount: string[] = await this.client.hmGet(
        `users:${currentUserId}`,
        'postsCount',
      );
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      await this.client.zAdd('post', {
        score: parseInt(uId, 10),
        value: `${key}`,
      });
      for (const [itemKey, itemValue] of Object.entries(dataToSave)) {
        multi.hSet(`posts:${key}`, `${itemKey}`, `${itemValue}`);
      }
      const count: number = parseInt(postCount[0], 10) + 1;
      multi.hSet(`users:${currentUserId}`, 'postsCount', count);
      multi.exec();
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getPostsFromCache(
    key: string,
    start: number,
    end: number,
  ): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      const reply: string[] = await this.client.zRange(key, start, end);
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      reply.reverse();
      for (const value of reply) {
        multi.hGetAll(`posts:${value}`);
      }
      const replies: PostCacheMultiType =
        (await multi.exec()) as PostCacheMultiType;
      const postReplies: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        post.commentsCount = Helpers.parseJson(
          `${post.commentsCount}`,
        ) as number;
        post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
        post.createdAt = new Date(
          Helpers.parseJson(`${post.createdAt}`),
        ) as Date;
        postReplies.push(post);
      }

      return postReplies;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getTotalPostsInCache(): Promise<number> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const count: number = await this.client.zCard('post');
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getPostsWithImagesFromCache(
    key: string,
    start: number,
    end: number,
  ): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      const reply: string[] = await this.client.zRange(key, start, end);
      reply.reverse();
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {
        multi.hGetAll(`posts:${value}`);
      }
      const replies: PostCacheMultiType =
        (await multi.exec()) as PostCacheMultiType;
      const postWithImages: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        if ((post.imgId && post.imgVersion) || post.gifUrl) {
          post.commentsCount = Helpers.parseJson(
            `${post.commentsCount}`,
          ) as number;
          post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
          post.createdAt = new Date(
            Helpers.parseJson(`${post.createdAt}`),
          ) as Date;
          postWithImages.push(post);
        }
      }
      return postWithImages;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getPostsWithVideosFromCache(
    key: string,
    start: number,
    end: number,
  ): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      const reply: string[] = await this.client.zRange(key, start, end, {
        REV: true,
      });
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {
        multi.hGetAll(`posts:${value}`);
      }
      const replies: PostCacheMultiType =
        (await multi.exec()) as PostCacheMultiType;
      const postWithVideos: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        if (post.videoId && post.videoVersion) {
          post.commentsCount = Helpers.parseJson(
            `${post.commentsCount}`,
          ) as number;
          post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
          post.createdAt = new Date(
            Helpers.parseJson(`${post.createdAt}`),
          ) as Date;
          postWithVideos.push(post);
        }
      }
      return postWithVideos;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getUserPostsFromCache(
    key: string,
    uId: number,
  ): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      const reply: string[] = await this.client.zRange(key, uId, uId, {
        REV: true,
        BY: 'SCORE',
      });
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {
        multi.hGetAll(`posts:${value}`);
      }
      const replies: PostCacheMultiType =
        (await multi.exec()) as PostCacheMultiType;
      const postReplies: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        post.commentsCount = Helpers.parseJson(
          `${post.commentsCount}`,
        ) as number;
        post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
        post.createdAt = new Date(
          Helpers.parseJson(`${post.createdAt}`),
        ) as Date;
        postReplies.push(post);
      }
      return postReplies;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getTotalUserPostsInCache(uId: number): Promise<number> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const count: number = await this.client.zCount('post', uId, uId);
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async deletePostFromCache(
    key: string,
    currentUserId: string,
  ): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const postCount: string[] = await this.client.hmGet(
        `users:${currentUserId}`,
        'postsCount',
      );
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      multi.zRem('post', `${key}`);
      multi.del(`posts:${key}`);
      multi.del(`comments:${key}`);
      multi.del(`reactions:${key}`);
      const count: number = parseInt(postCount[0], 10) - 1;
      multi.hSet(`users:${currentUserId}`, 'postsCount', count);
      await multi.exec();
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async updatePostInCache(
    key: string,
    updatedPost: IPostDocument,
  ): Promise<IPostDocument> {
    const {
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      imgVersion,
      imgId,
      videoId,
      videoVersion,
      profilePicture,
    } = updatedPost;
    const dataToSave = {
      post: `${post}`,
      bgColor: `${bgColor}`,
      feelings: `${feelings}`,
      privacy: `${privacy}`,
      gifUrl: `${gifUrl}`,
      videoId: `${videoId}`,
      videoVersion: `${videoVersion}`,
      profilePicture: `${profilePicture}`,
      imgVersion: `${imgVersion}`,
      imgId: `${imgId}`,
    };

    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      for (const [itemKey, itemValue] of Object.entries(dataToSave)) {
        await this.client.hSet(`posts:${key}`, `${itemKey}`, `${itemValue}`);
      }
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      multi.hGetAll(`posts:${key}`);
      const reply: PostCacheMultiType =
        (await multi.exec()) as PostCacheMultiType;
      const postReply = reply as IPostDocument[];
      postReply[0].commentsCount = Helpers.parseJson(
        `${postReply[0].commentsCount}`,
      ) as number;
      postReply[0].reactions = Helpers.parseJson(
        `${postReply[0].reactions}`,
      ) as IReactions;
      postReply[0].createdAt = new Date(
        Helpers.parseJson(`${postReply[0].createdAt}`),
      ) as Date;

      return postReply[0];
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }
}
