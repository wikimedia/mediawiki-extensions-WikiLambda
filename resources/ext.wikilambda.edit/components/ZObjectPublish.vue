<template>
	<!--
		Wikilambda Vue component for publishing a zobject.
		Contains both the publish button and the dialog pop-up flow prior
		to submission.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilamba-publish-zobject">
		<cdx-button
			class="ext-wikilamba-publish-zobject__publish-button"
			:action="action"
			@click.stop="handlePublish">
			{{ $i18n( 'wikilambda-publishnew' ).text() }}
		</cdx-button>
		<publish-dialog
			:show-dialog="showPublishDialog"
			:should-unattach-implementation-and-tester="shouldUnattachImplementationAndTester"
			@close-dialog="closeDialog">
		</publish-dialog>
	</div>
</template>

<script>
var CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapActions = require( 'vuex' ).mapActions,
	PublishDialog = require( './editor/PublishDialog.vue' );

// @vue/component
module.exports = exports = {
	name: 'z-object-publish',
	components: {
		'cdx-button': CdxButton,
		'publish-dialog': PublishDialog
	},
	props: {
		shouldUnattachImplementationAndTester: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	data: function () {
		return {
			action: 'progressive',
			showPublishDialog: false
		};
	},
	methods: $.extend( {},
		mapActions( [ 'validateZObject' ] ),
		{
			handlePublish: function () {
				this.validateZObject().then( function ( validation ) {
					if ( validation.isValid ) {
						this.showPublishDialog = true;
					}
				}.bind( this ) );
			},
			closeDialog: function () {
				this.showPublishDialog = false;
			}
		}
	)
};
</script>
