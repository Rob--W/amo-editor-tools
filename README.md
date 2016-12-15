My tools to make life more pleasant for AMO reviewers!

## Features

- Add extra column to review queue that shows the size of the files (JS minus
  libraries, and some other categories).
- The above information is cached per add-on and version. The cache has a fixed
  maximum size and old items are automatically eviced. To manually clear the
  cached metadata, double-click on the "Size" head above the column.

### Meaning of size information
The size information is a best-effort estimate of the review complexity.
A small size does *not* necessarily imply that the review is easy, and
a large size does *not* necessarily imply that the review is difficult either.
For example, add-ons that embed jar files have a size of "0", and they are not
necessarily easy...

The main purpose of this is to help with time management and minimizing the
review queue in a faster way. On average, reviewing a 1 MB add-on will probably
take more time than 20 add-ons of 1000 bytes each. Doing the latter makes the
queue much smaller, so that small add-ons don't have to wait an excessive amount
of time to get their small add-on approved.

I'd like to stress that you should not only focus on the small add-ons, the big
add-ons should also be reviewed eventually. And again, big does not necessarily
mean difficult.


## Usage

This is currently a SDK add-on because WebExtensions cannot run on AMO.
You need an unbranded/non-release Firefox version to load the unsigned xpi.

```
jpm xpi
```

If others find this useful too, I may upload it to AMO.
